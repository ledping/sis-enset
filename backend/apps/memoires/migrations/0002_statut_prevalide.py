# Generated manually for SIS ENSET semi-automatic workflow
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('memoires', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='memoire',
            name='statut',
            field=models.CharField(
                choices=[
                    ('SOUMIS', 'Soumis'),
                    ('PREVALIDE', 'Prévalidé automatiquement'),
                    ('VALIDE', 'Archivé'),
                    ('REJETE', 'Rejeté'),
                ],
                default='SOUMIS',
                max_length=12,
            ),
        ),
    ]
