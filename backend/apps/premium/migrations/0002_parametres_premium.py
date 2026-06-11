from django.db import migrations, models


def create_defaults(apps, schema_editor):
    ParametresPremium = apps.get_model('premium', 'ParametresPremium')
    ParametresPremium.objects.get_or_create(
        pk=1,
        defaults={
            'orange_money_numero': '696781788',
            'mtn_momo_numero': '680345705',
            'beneficiaire': 'Departement ENSET Douala',
            'note_paiement': 'Apres paiement, renseignez la reference de transaction et ajoutez une capture ou un recu comme preuve.',
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ('premium', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ParametresPremium',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('orange_money_numero', models.CharField(default='696781788', max_length=30)),
                ('mtn_momo_numero', models.CharField(default='680345705', max_length=30)),
                ('beneficiaire', models.CharField(default='Departement ENSET Douala', max_length=180)),
                ('note_paiement', models.TextField(blank=True, default='Apres paiement, renseignez la reference de transaction et ajoutez une capture ou un recu comme preuve.')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Parametres premium',
                'verbose_name_plural': 'Parametres premium',
            },
        ),
        migrations.RunPython(create_defaults, migrations.RunPython.noop),
    ]
