# Generated for SIS ENSET v11.3 premium access
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('documents', '0001_initial'),
        ('premium', '0004_dynamic_plans_promotions'),
    ]

    operations = [
        migrations.CreateModel(
            name='AchatDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('credit_utilise', models.BooleanField(default=True)),
                ('gratuit', models.BooleanField(default=False)),
                ('commentaire', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='achats_premium', to='documents.document')),
                ('utilisateur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='achats_documents', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Acces document premium',
                'verbose_name_plural': 'Acces documents premium',
                'ordering': ['-created_at'],
                'unique_together': {('utilisateur', 'document')},
            },
        ),
    ]
